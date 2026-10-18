import { expect, test } from '@playwright/test'

test('media layout adapts to available space and restores its scroll and geometry after expansion', async ({
  page,
}, info) => {
  test.setTimeout(90000)
  const mobile = info.project.name.includes('mobile')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.goto('/floratrium', { waitUntil: 'domcontentloaded' })
  const layout = page.locator('.flora-media-region')
  const album = page.locator('.flora-album-gallery')
  const video = page.locator('.flora-video-gallery')
  await expect(album).toBeVisible({ timeout: 45000 })
  const profile = layout.locator(
    ':scope > .flora-pet-overview > .flora-pet-profile'
  )
  await expect(profile.locator('.flora-pet-level')).toHaveCount(1)
  await expect(
    profile.locator('.flora-pet-profile__moves .flora-moves')
  ).toHaveCount(1)
  await expect(layout.locator('.flora-media-region__moves')).toHaveCount(0)
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 20000,
  })
  if (mobile) {
    const alert = page.locator('.mobile-experience-alert')
    await expect(alert).toBeVisible({ timeout: 20000 })
    await alert.click()
  }
  await page.evaluate(() => document.fonts.ready)
  const albumElement = await album.elementHandle()
  const sizes = mobile
    ? [
        { width: 412, height: 839 },
        { width: 390, height: 700 },
      ]
    : [
        { width: 1920, height: 1080 },
        { width: 1440, height: 900 },
        { width: 1280, height: 720 },
      ]
  for (const size of sizes) {
    await page.setViewportSize(size)
    await layout.evaluate(async (element) => {
      element.scrollTop = 0
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
    })
    const geometry = await page.evaluate(() => {
      const rect = (selector: string) =>
        document.querySelector(selector)!.getBoundingClientRect()
      const level = rect('.flora-pet-level')
      const moves = rect('.flora-moves')
      const name = rect('.flora-moves .flora-move-card__name')
      const album = rect('.flora-album-gallery')
      const video = rect('.flora-video-gallery')
      return {
        levelGap: name.top - level.bottom,
        leftAlignment: moves.left - level.left,
        mediaGap: Math.min(album.top, video.top) - moves.bottom,
        album: album.toJSON(),
        video: video.toJSON(),
        order: [...document.querySelectorAll('.flora-media-panel')].map((el) =>
          el.classList.contains('flora-album-gallery') ? 'album' : 'video'
        ),
      }
    })
    expect(geometry.levelGap).toBeGreaterThanOrEqual(8)
    expect(Math.abs(geometry.leftAlignment)).toBeLessThanOrEqual(1)
    expect(geometry.mediaGap).toBeGreaterThanOrEqual(0)
    expect(
      Math.abs(geometry.album.width - geometry.video.width)
    ).toBeLessThanOrEqual(1)
    expect(
      Math.abs(geometry.album.height - geometry.video.height)
    ).toBeLessThanOrEqual(1)
    expect(geometry.order).toEqual(
      mobile ? ['video', 'album'] : ['album', 'video']
    )
    if (mobile)
      expect(geometry.album.top).toBeGreaterThan(geometry.video.bottom)
    else {
      expect(
        Math.abs(geometry.album.top - geometry.video.top)
      ).toBeLessThanOrEqual(1)
      expect(geometry.video.left - geometry.album.right).toBeCloseTo(16, 0)
    }
  }
  expect(
    await albumElement!.evaluate(
      (el) => el === document.querySelector('.flora-album-gallery')
    )
  ).toBe(true)
  await layout.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  const scrollBefore = await layout.evaluate((element) => element.scrollTop)
  expect(scrollBefore).toBeGreaterThan(0)
  const boundsBefore = (await album.boundingBox())!
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  for (const opening of [true, false]) {
    const frames = await album.evaluate(async (element) => {
      const button = element.querySelector<HTMLButtonElement>(
        '.flora-album-gallery__expand'
      )!
      const frames: {
        left: number
        buttonWidth: number
        buttonHeight: number
      }[] = []
      button.click()
      const deadline = performance.now() + 1000
      await new Promise<void>((resolve) => {
        const sample = () => {
          const panel = element.getBoundingClientRect()
          const control = button.getBoundingClientRect()
          frames.push({
            left: panel.left,
            buttonWidth: control.width,
            buttonHeight: control.height,
          })
          if (performance.now() < deadline) requestAnimationFrame(sample)
          else resolve()
        }
        requestAnimationFrame(sample)
      })
      return frames
    })
    expect(
      Math.max(...frames.map((frame) => frame.buttonHeight)) -
        Math.min(...frames.map((frame) => frame.buttonHeight))
    ).toBeLessThanOrEqual(1)
    if (mobile) {
      expect(
        Math.max(...frames.map((frame) => frame.left)) -
          Math.min(...frames.map((frame) => frame.left))
      ).toBeLessThanOrEqual(1)
      expect(
        Math.max(...frames.map((frame) => frame.buttonWidth)) -
          Math.min(...frames.map((frame) => frame.buttonWidth))
      ).toBeLessThanOrEqual(1)
    }
    if (opening) {
      await expect(video).toBeHidden()
      if (mobile) {
        const bounds = (await album.boundingBox())!
        expect(Math.abs(bounds.y)).toBeLessThanOrEqual(1)
        expect(bounds.height).toBeCloseTo(page.viewportSize()!.height, 0)
      }
    } else {
      await expect(layout).not.toHaveClass(/is-layer-active/)
      await expect(video).toBeVisible()
    }
  }
  expect(
    Math.abs(
      (await layout.evaluate((element) => element.scrollTop)) - scrollBefore
    )
  ).toBeLessThanOrEqual(1)
  const boundsAfter = (await album.boundingBox())!
  for (const key of ['x', 'y', 'width', 'height'] as const)
    expect(Math.abs(boundsAfter[key] - boundsBefore[key])).toBeLessThanOrEqual(
      1
    )

  await page.evaluate(() => {
    const root = document.querySelector('.temple-page')!
    const container = document.querySelector('.router-container')!
    const baseline = [root, container].map((el) => el.getBoundingClientRect())
    const probe = { frames: 0, maxShift: 0 }
    ;(window as any).floraLayoutLeaveProbe = probe
    const sample = () => {
      if (!root.isConnected) return
      probe.frames++
      ;[root, container].forEach((el, index) => {
        const bounds = el.getBoundingClientRect()
        probe.maxShift = Math.max(
          probe.maxShift,
          Math.abs(bounds.top - baseline[index].top),
          Math.abs(bounds.left - baseline[index].left)
        )
      })
      requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
    void (
      document.querySelector('#app') as any
    ).__vue_app__.config.globalProperties.$router.push('/craft')
  })
  await expect(page.locator('.craft-page')).toBeVisible({ timeout: 30000 })
  const leaving = await page.evaluate(
    () => (window as any).floraLayoutLeaveProbe
  )
  expect(leaving.frames).toBeGreaterThan(0)
  expect(leaving.maxShift).toBeLessThanOrEqual(1)
})
