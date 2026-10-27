import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
})

test('collections render inside the Island viewport and keep their cards while scrolling', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/atrium/collections', { waitUntil: 'domcontentloaded' })
  const content = page.locator('.island-collections-content')
  await expect(content).toBeVisible({ timeout: 45000 })
  const cards = content.locator('.collection-card-entry')
  const count = await cards.count()
  expect(count).toBeGreaterThan(10)
  await expect(
    content.locator('.detail-page-header, .bottom-text')
  ).toHaveCount(0)
  const viewport = page.locator('.island-detail .scroll-viewport__scroll')
  const scrollable = await viewport.evaluate((element) => {
    element.scrollTop = element.scrollHeight
    return element.scrollHeight > element.clientHeight
  })
  expect(scrollable).toBe(true)
  await expect(cards).toHaveCount(count)
  expect(await page.evaluate(() => document.body.scrollTop)).toBe(0)
})

test('collection boxes expand into a centered gallery and restore without shifting the shelf', async ({
  page,
}, testInfo) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/atrium/collections', { waitUntil: 'domcontentloaded' })
  const content = page.locator('.island-collections-content')
  await expect(content).toBeVisible({ timeout: 45000 })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 30000,
  })
  const source = content.locator('.collection-card-entry').first()
  const viewport = page.locator('.island-detail .scroll-viewport__scroll')
  await source.scrollIntoViewIfNeeded()
  const position = () =>
    source.evaluate((element) => {
      const bounds = element.getBoundingClientRect()
      return {
        top: bounds.top,
        left: bounds.left,
        bodyWidth: document.body.getBoundingClientRect().width,
        scroll: document.querySelector(
          '.island-detail .scroll-viewport__scroll'
        )!.scrollTop,
      }
    })
  const initial = await position()
  const modal = page.locator('.collection-detail-modal')
  for (const closeBy of ['button', 'backdrop']) {
    await source.evaluate((element) => {
      ;(window as any).__collectionShell = element.querySelector(
        '.collection-card-shell'
      )
    })
    await source.locator('button').click()
    await expect(modal).toBeVisible()
    expect(
      await modal.evaluate(
        (element) =>
          element.querySelector('.collection-card-shell') ===
          (window as any).__collectionShell
      )
    ).toBe(true)
    const simultaneous = await modal.evaluate((element) => {
      const cover = element.querySelector('.collection-card__screen-cover')!
      const style = getComputedStyle(cover)
      return {
        shellAnimation: getComputedStyle(element).animationName,
        coverAnimation: style.animationName,
        coverDelay: style.animationDelay,
        coverDuration: style.animationDuration,
        galleryDuration: getComputedStyle(
          element.querySelector('.collection-card__gallery')!
        ).animationDuration,
        galleryDelay: getComputedStyle(
          element.querySelector('.collection-card__gallery')!
        ).animationDelay,
      }
    })
    expect(simultaneous).toEqual({
      shellAnimation: 'none',
      coverAnimation: 'anutriumCrtOff',
      coverDelay: '0s',
      coverDuration: '0.18s',
      galleryDuration: '0.22s',
      galleryDelay: '0.08s',
    })
    await expect(page).toHaveURL(/\/atrium\/collections$/)
    await expect(modal.locator('.media-gallery__card').first()).toBeVisible()
    await expect(modal.locator('.collection-card__screen-cover')).toHaveCSS(
      'opacity',
      '0'
    )
    await modal.evaluate(async (element) => {
      await Promise.allSettled(
        element.getAnimations().map((animation) => animation.finished)
      )
    })
    const galleryLayout = await modal.evaluate((element) => {
      const gallery = getComputedStyle(element.querySelector('.media-gallery')!)
      const scroll = getComputedStyle(
        element.querySelector('.collection-card__gallery')!
      )
      return {
        columns: gallery.gridTemplateColumns.split(' ').length,
        padding: [
          scroll.paddingTop,
          scroll.paddingRight,
          scroll.paddingBottom,
          scroll.paddingLeft,
        ].map(parseFloat),
        width: element.getBoundingClientRect().width,
        expectedWidth: Math.min(1280, innerWidth - 48),
      }
    })
    expect(galleryLayout.columns).toBe(3)
    expect(galleryLayout.padding.every((value) => value >= 12)).toBe(true)
    expect(galleryLayout.width).toBeGreaterThanOrEqual(
      galleryLayout.expectedWidth - 1
    )
    const geometry = await modal.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      const close = element
        .querySelector('.diamond-close-btn')!
        .getBoundingClientRect()
      return {
        center: Math.abs(rect.left + rect.width / 2 - innerWidth / 2),
        bottom: rect.bottom,
        closeTop: close.top,
        closeCenter: Math.abs(close.left + close.width / 2 - innerWidth / 2),
        height: rect.height,
        viewportHeight: innerHeight,
      }
    })
    expect(geometry.center).toBeLessThanOrEqual(1)
    expect(geometry.closeCenter).toBeLessThanOrEqual(1)
    expect(geometry.closeTop).toBeGreaterThan(geometry.bottom)
    expect(geometry.height).toBeLessThan(geometry.viewportHeight)
    await page.mouse.move(4, 4)
    await page.mouse.wheel(0, 400)
    const during = await position()
    for (const key of Object.keys(initial) as (keyof typeof initial)[])
      expect(Math.abs(during[key] - initial[key])).toBeLessThanOrEqual(1)
    await modal.evaluate((dialog) => {
      const probe = {
        running: true,
        coverStarts: 0,
        heights: [] as number[][],
        fades: [] as { close: number; shade: number; vignette: number }[],
        handoff: [] as {
          returned: boolean
          ghostOpacity: number
          dialogVisible: boolean
          delta: number
          coverAnimation: string
          coverOpacity: number
        }[],
      }
      const close = dialog.querySelector('.diamond-close-btn')!
      const cover = dialog.querySelector('.collection-card__screen-cover')!
      const onAnimationStart = (event: AnimationEvent) => {
        if (event.target === cover && event.animationName === 'anutriumCrtOn')
          probe.coverStarts++
      }
      document.addEventListener('animationstart', onAnimationStart)
      ;(probe as any).cleanup = () =>
        document.removeEventListener('animationstart', onAnimationStart)
      ;(window as any).__collectionFontProbe = probe
      const sample = () => {
        const shell = (window as any).__collectionShell as HTMLElement
        const source = shell.closest('.collection-card-entry')
        const ghost = dialog.querySelector('.collection-return-ghost')
        const bounds = shell.getBoundingClientRect()
        const origin = source?.getBoundingClientRect()
        probe.handoff.push({
          returned: !!source,
          ghostOpacity: ghost ? Number(getComputedStyle(ghost).opacity) : -1,
          dialogVisible: dialog.getClientRects().length > 0,
          coverAnimation: getComputedStyle(
            shell.querySelector('.collection-card__screen-cover')!
          ).animationName,
          coverOpacity: Number(
            getComputedStyle(
              shell.querySelector('.collection-card__screen-cover')!
            ).opacity
          ),
          delta: origin
            ? Math.max(
                Math.abs(bounds.left - origin.left),
                Math.abs(bounds.top - origin.top),
                Math.abs(bounds.width - origin.width),
                Math.abs(bounds.height - origin.height)
              )
            : 0,
        })
        probe.fades.push({
          close: Number(getComputedStyle(close).opacity),
          shade: Number(
            getComputedStyle(shell.querySelector('.collection-card__shade')!)
              .opacity
          ),
          vignette: Number(
            getComputedStyle(
              shell.querySelector('.collection-card__media')!,
              '::after'
            ).opacity
          ),
        })
        probe.heights.push(
          [
            ...shell.querySelectorAll(
              '.collection-card__copy > strong, .collection-card__copy > small, .collection-card__count > span'
            ),
          ].map((element) => element.getBoundingClientRect().height)
        )
        if (probe.running) requestAnimationFrame(sample)
      }
      sample()
    })
    if (closeBy === 'button') {
      await page.screenshot({
        path: testInfo.outputPath('collection-expanded.png'),
      })
      await modal.locator('.diamond-close-btn').click()
    } else await page.mouse.click(4, 4)
    await expect(modal).toBeHidden()
    await expect(source).not.toHaveClass(/is-opening/)
    await expect(source.locator('button')).toBeVisible()
    const fontDelta = await source.evaluate(() => {
      const probe = (window as any).__collectionFontProbe
      probe.running = false
      probe.cleanup()
      const shell = (window as any).__collectionShell as HTMLElement
      const restored = [
        ...shell.querySelectorAll(
          '.collection-card__copy > strong, .collection-card__copy > small, .collection-card__count > span'
        ),
      ].map((element) => element.getBoundingClientRect().height)
      return Math.max(
        ...probe.heights.flatMap((sample: number[]) =>
          sample.map((height, index) => Math.abs(height - restored[index]))
        )
      )
    })
    expect(fontDelta).toBeLessThanOrEqual(1)
    const fades = await page.evaluate(
      () =>
        (window as any).__collectionFontProbe.fades as {
          close: number
          shade: number
          vignette: number
        }[]
    )
    expect(
      fades.some(({ close }) => close > 0 && close < 1),
      JSON.stringify({
        closeBy,
        opacity: [...new Set(fades.map(({ close }) => close))],
      })
    ).toBe(true)
    expect(fades.some(({ shade }) => shade > 0 && shade < 1)).toBe(true)
    expect(fades.some(({ vignette }) => vignette > 0 && vignette < 1)).toBe(
      true
    )
    expect(fades[fades.length - 1]).toEqual({ close: 0, shade: 1, vignette: 1 })
    const handoff = await page.evaluate(
      () =>
        (window as any).__collectionFontProbe.handoff as {
          returned: boolean
          ghostOpacity: number
          dialogVisible: boolean
          delta: number
          coverAnimation: string
          coverOpacity: number
        }[]
    )
    expect(
      handoff.some(
        (sample) =>
          sample.returned &&
          sample.dialogVisible &&
          sample.ghostOpacity > 0 &&
          sample.ghostOpacity < 1
      )
    ).toBe(true)
    expect(
      Math.max(
        ...handoff
          .filter((sample) => sample.returned)
          .map((sample) => sample.delta)
      )
    ).toBeLessThanOrEqual(1)
    expect(
      handoff
        .filter((sample) => sample.returned)
        .every(
          (sample) =>
            sample.coverAnimation === 'none' && sample.coverOpacity === 1
        )
    ).toBe(true)
    expect(
      await page.evaluate(
        () => (window as any).__collectionFontProbe.coverStarts
      )
    ).toBe(1)
    await expect(page.locator('.collection-return-ghost')).toHaveCount(0)
    const restored = await position()
    for (const key of Object.keys(initial) as (keyof typeof initial)[])
      expect(Math.abs(restored[key] - initial[key])).toBeLessThanOrEqual(1)
    expect(await viewport.evaluate((element) => element.scrollTop)).toBe(
      initial.scroll
    )
  }
})
